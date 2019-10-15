# Rotate-pie
Rotate-pie based on F2 &amp; G

<center>

<img src="https://f2-pie-test.oss-cn-hangzhou.aliyuncs.com/Rotate-Animation.gif" width="320">

</center>

#### 一、设计需求

&emsp;&emsp;F2库在一些可视化组件的无线端的交互体验不足，需要定制一些组件与展现效果。研究基于G，封装一个类似Roambi饼图，具有滚动与交互效果。

#### 二、实现方案

##### 1. 功能拆分

（1）静态饼状图，由数据驱动，根据数据的分布情况映射成几何图像。

（2）**饼状图的动态交互效果，根据用户的手势，分为panstart、panmove、panend三个阶段，分析三个阶段触发的不同的效果，进行函数的封装**（下面的动画效果拆分部分会详细分析）。

（3）**组件需要一个固定的位置，每当饼状图的这个部分经过固定位置时，获取当前对应元素的数据，去动态更新数据标签部分。**

##### 2. 动画效果拆分

（1）用户在刚接触图表，尚未开启滑动的时候（即panstart时），需要初始化总体旋转的角度（totalAngle=0），记录用户滑动初始的角度（newMouseAngle）。

（2）用户在滑动饼状图时（即panmove时），饼状图的元素需要根据用户的手势进行相应的动效，所以需要计算每一次手势移动出发时产生的角度差（即diffAngle），同时更新每一次移动导致的totalAngle的变化（如果没有手势操作后的后续滑动，该参数将用于最后更新饼图的状态）。然后，饼图跟随手势移动。

（3）用户在完成手势操作后，饼状图需要进行一部分的滑动效果，用于提升用户的使用体验。

- **饼状图最后滑动的时长、以及滑动的速度，其实取决于用户滑动手势的最后时刻的速度，如果速度越快，相应的饼状图转动速度越快，动画的duration越久（但需要设定阈值，避免动画时间过久导致用户体验降低）**。
- 饼状图最后时刻的滑动速度由用户滑动饼状图最后时刻的diffAngle这一参数反映，因为diffAngle越大，说明在最后时刻，用户手势操作的速度越快，对应的交互效果也不同。

（4）在完成所有的滑动效果后，为了让用户有更明确的数据指向，因此需要计算当前元素悬停的位置，并且调整元素，使箭头指向元素的中心位置。指向中心位置，通过获取所有元素的起始角度（startAngle）和终止角度（endAngle）来判定最终的悬停元素，之后设置动画来实现悬停。

（5）在饼图运动的过程中，需要和Legend产生联动，便于用户观察原始数据。首先计算每个元素的起始角度和终止角度来找到运动过程中箭头指向的元素，然后根据该元素对象上的name、value和color去更新Label。

#### 三、方案思考

&emsp;&emsp;在饼图的原始数据触发过程中，需要展示箭头指向的元素的name和value，对于元素与数据展示部分有两种实现方式，**一种是封装自定义Interaction，结合Tooltip的trigerOn的配置项实现；一种是根据自定义Legend和元素的对象属性来实现。**下面对两种方法进行比较：

##### 1. 封装自定义Interaction

&emsp;&emsp;F2的Tooltip的triggerOn配置项表示tooltip出现的触发行为，常用的有'touchstart'，'touchmove'等，但是没有合适的交互行为类能够直接满足需求。

&emsp;&emsp;**F2提供一套交互行为的注册机制，同时交互行为也可提供配置化的反馈（结果）。因此需要封装一个自定义的Interaction，在元素经过箭头指向的位置时触发，借此来更新Tooltip**。

- 优点：通过封装自定义的Interaction，对于该部分的Interaction复用提供便利。同时封装Interaction，不暴露给用户，代码更简洁，在系统实现方面更方便。
- 缺点：这种Interaction较为特殊，一般只有在可交互的饼图才会使用，因此可复用性不大；对于自定义的Interaction，需要借助公有属性、方法去实现、封装自定义交互行为类，之后需要对其进行注册、使用。在实现方面，逻辑复杂度和难度也大于方案2。

##### 2. Legend的custom配置

&emsp;&emsp;**F2的Legend的API提供设置图例项的name、value和color，只需要将其custom设置为true，之后在组件内通过封装函数即可在触发的时候调用。**demo中即采用该方法实现。

- 优点：通过F2原生的Legend，通过配置项和触发函数的封装即可实现该功能，从实现上来看，该方法的实现难度小于方案1；同时代码的逻辑也比方案1简单。
- 缺点：使用Legend来实现数据的交互展示效果，会占用Legend本身的展示效果，比如在特定的使用场景下，需要展示所有数据的Legend，同时要实现数据的交互展示，这种方法就可能导致Legend本身的展示效果没法体现。

&emsp;&emsp;针对两种方法的比较、实现的复杂度和项目需求匹配，使用方案2实现，方案1在后续的学习中将会尝试。

#### 四、实现步骤

##### 1. 饼状图的初始化

&emsp;&emsp;静态饼状图的实现需要通过数据实现几何图形和组件整体的映射，基于F2来初始化静态饼状图。

##### 2. 饼状图的完整动态效果

&emsp;&emsp;饼状图的完整动态效果包括用户在进行交互操作时的手势决定。从用户接触屏幕开始，到进行交互手势的运动，再到完成交互手势，需要封装不同的动态效果。

具体的动态效果包含以下几种：

- 饼状图伴随交互手势的旋转移动，主要计算diffAngle，然后设置动画效果；
- 交互手势完成后，根据交互手势的最后速度，实现饼状图的滑动效果；

- 饼图完成滑动后，箭头需要指向当前饼图元素的中间；

##### 3. 饼图与Legend的交互

&emsp;&emsp;饼图在旋转的过程中，需要显示箭头指向的元素的name、value和color，用来更新Legend的元素。

---

#### 10月4日更新

#### 一、迭代需求：提供除旋转外的zoom能力

&emsp;&emsp;当饼图存在数据密集区域，该区域支持zoom操作，以方便用户选择对应数据区块。

1. 关于zoom效果：当用户touchstart，则将该区域扩大为整个饼图宽度的50%，以方便用户选择。

2. 关于什么叫数据密集区域：以iPhone推荐的最小点击区域 44x44 Points作为标准，该大小即人类指腹的大小。当用户touch某个点时，计算该点位中心44x44 Points正方形内，如果存在超过>=2个数据区块，则将落入该区域的所有区块算作数据密集区域进行zoom。

3. 关于Points和pix的换算：该理论的提出是在手机320pointsx480points，屏幕4inc（对角线长度），下提出的。可以计算下44x44points对应的是多少物理的长宽英寸。再集合不同手机的屏幕大小和长宽比，确定该手机下密集区域的长宽px应当是多少。

4. 当处于zoom态时，用户touchmove可选中对应的区域。当touchend时，该区域选中高亮


<center>

![Update1](https://f2-pie-test.oss-cn-hangzhou.aliyuncs.com/Update.png)

###### 需求效果图1

</center>

#### 二、实现方案

##### 1. 功能拆分

&emsp;&emsp;（1）实现饼状图的点击zoom操作效果，用户在点击饼状图时，如果是非数据密集的区域，则展现放大的效果

&emsp;&emsp;（2）用户在点击饼状图的数据密集区域时，将该区域扩大为整个饼图宽度的50%，方便用户的交互选择

&emsp;&emsp;（3）在完成数据密集区的选择后，再次点击周边的位置的时候，进行饼状图的还原效果

##### 2. 动画效果的拆分

&emsp;&emsp;（1）当用户点击饼图的元素的时候（也就是Hammer.js中的tap手势操作的时候）饼状图将点击的元素旋转至箭头指向的位置，便于用户观察饼状图的原始数值。

&emsp;&emsp;（2）用户的选取操作是为了对数据密集区域进行放大操作（Zoom），即将数据密集的区域扩展到整个饼状图超过50%的地方。为了区别用户的点击与选取操作，因此将数据密集区的选取放大操作结合手势press进行操作。即用户在饼状图的元素上点击悬停即可实现缩放。

&emsp;&emsp;（3）数据密集区域的判定根据用户操作的核心即center点区域范围内进行设定，如一些设备推荐的点击区域设置为44*44points，需要对points与pix进行替换，则需要获取使用设备的屏幕的大小来设置。对于数据密集区域的选取实现的方案，尝试了两种方法：

- 首先获取用户手势的中心位置，以数组的数据格式来进行保存，即[e.center.x, e.center.y]，然后将44*44Points对应到组件的应用终端的pix单位上，假设数据密集区的判定根据矩形的四个顶点，则获得四个顶点和中心点后映射到对应的元素。

- 以用户手势的中心位置为原点，通过设定范围，然后在范围内多次采样，保证范围内所有的元素都能够被选取到，通过随机采样的方式来映射到对应的元素。

&emsp;&emsp;（4）如果对于用户的选取操作为非数据密集区域，则将其进行高亮操作，即将非选择的元素透明度设置为合适的值。

&emsp;&emsp;（5）对于数据密集区域，饼状图首先将元素进行高亮处理，便于用户初步观察数据密集区的位置及数量，之后将数据密集区域进行放大，放大到整个饼图的50%以上。对于元素的高亮和放大效果实现，尝试两种的实现方法：

- 分别获取数据密集区的元素和非数据密集区的元素，然后对所有元素重新设定每个元素的数据与属性，重新绘制整个图表，重新得到一个图表。

- 获取数据密集区的元素和非数据密集区的元素，通过计算去改变每个元素的属性

#### 三、方案思考

##### 1. 数据密集区的选择

&emsp;&emsp;对于数据密集区的选择需要计算用户touch某个点的点位的44*44Points作为标准，为人类标准的指腹的大小，关于这部分的方案，尝试了以下两种方法。

&emsp;&emsp;（1）方法一：提取用户touch的点位，以此点位为中心，计算正方形四个顶点的位置，加上中心位置，可以得到五个点位，根据这五个点位去映射对应的元素，从而可以得到五个元素（五个元素中存在重复，需要进行去重）

- 优点：相对于方法二，对于点到元素映射的计算要小

- 缺点：由于只计算四个顶点和中心的点，如果在数据密集的区域，会导致选择出来的元素不连续的情况出现，因为只选择顶点和中心点，则会导致这种情况出现。如果除了顶点，再添加一些四个边上的点的话，也还会出现这种情况

&emsp;&emsp;（2）方法二：提取用户touch的点位，以此点位为中心，touch的范围为上界，使用随机采样的方式，在范围内采样几十个点，由于随机采样的性质，当采样数较大的时候（如取100）,则可以基本覆盖范围内的所有的元素。

- 优点：相对于方法一，可以保证选取到覆盖范围内所有的数据密集区域的元素，同时由于随机采样的特性，可以保证选取到的数据密集区域的元素都是连续的。可以较好的满足需求。

- 缺点：相对于方法一，提高的计算量，但是如果需要采用方法一，必然要对方法一进行改进，也会导致方法一的计算量增加。因此综合考虑使用方法二来实现。

##### 2. 数据密集区元素的交互

&emsp;&emsp;对于数据密集区元素的交互，需要考虑以下问题：

&emsp;&emsp;（1）用户在完成Press手势操作之后，会发生什么？也就是交互的逻辑，首先最主要的是根据数据密集区的判定，对数据选择区域进行高亮，这样有利于提高交互性能，同时也能够为用户带来反馈。无论选择的区域是数据密集区域或是非数据密集区域，都需要有相应的响应出现。

&emsp;&emsp;（2）对于数据密集区域，同时需要进行计算判定选定的数据密集区域本身是否已经超过饼状图的50%以上。因为用户可能会触及到饼状图的一些边缘位置，会导致多个数据密集区域触发，因此对于占比低于50%的元素，需要对其进行缩放，否则不需要缩放。

##### 3. 缩放交互的设计原则

&emsp;&emsp;要实现数据密集区域的缩放效果，同时在不创建新的chart的原则下，尝试了以下两种方法：

&emsp;&emsp;（1）方法一：用户在触发数据密集区之后，为了不重新绘制图表，则通过数据的比例变换，去改变所有元素的startAngle和endAngle，重新计算每个元素的diffAngle，来重新绘制图表。

- 优点：不改变图表的原来的配置，不会出现方法二的peiLabel的情况

- 缺点：缺点较为明显，需要计算所有的元素的diffAngel，因为变化数据密集区域的元素同时，也需要变化非数据密集区域。在完成变化之后，返回到图表之前的形态较为麻烦，需要进行还原。涉及到的计算多，容易出现偏差。

&emsp;&emsp;（2）方法二：用户在触发数据密集区之后，根据数据密集区的元素名称，去获取选择的元素(selectedShape)的名称，然后去改变图表的原始数据，并且重新绘制chart，同时在chart上加上PieLabel，便于用户直接观察数据密集区的数据。

- 优点：相对与方法一，不会导致原来图表的形状改变，同时，在放大之后，有pieLabel作为辅助观察数据，便于选择，同时，完成选择之后，点击，可以进一步交互，最后还原到原来的图表时，箭头也会指向用户原则的元素。

- 缺点：因为在放大之后，直接在原来的chart上进行改变，虽然可以改变数据，来驱动图表的变化，但是由于加上的pieLabel，所以在返回后，原来的图表上也会有pieLabel，由于F2对于pieLabel也没有配置项来删除，因此通过设置其为透明色来实现视觉上的删除。

##### 4. 缩放交互效果

&emsp;&emsp;缩放交互的效果方面，尝试了两种方法，对比如下：

&emsp;&emsp;（1）方法一：将图表映射为50%到90%之间的扇形图上

- 优点：与原来的图表进行区分，这样的话在视觉效果上比方法二要好一点

- 缺点：需要改变图表的初始设置项，即startAngle和endAngle，这样的话，在还原到原来的图表的时候，会有影响（如下图所示），同时如果为了消除这样的影响，又需要在完成交互后重新配置图表，如果这样的话，用户在缩放后进行的选择，也会刷新，导致交互体验下降。

<center>

![1](https://f2-pie-test.oss-cn-hangzhou.aliyuncs.com/reports2/1.png)

###### 采用扇形图的方式表现

![2](https://f2-pie-test.oss-cn-hangzhou.aliyuncs.com/reports2/2.png)

###### 采用扇形图的方式存在的问题

</center>

&emsp;&emsp;（2）方法二：将图表映射为整个饼状图，同时加上pieLabel来显示每个数据的具体情况

- 优点：交互动作逻辑较为清楚，在设置过程中，有明确的数据显示，便于用户的观察与选择

- 缺点：相较于方法一，个人感觉在交互的效果上稍微差了一点点。

<center>

![3](https://f2-pie-test.oss-cn-hangzhou.aliyuncs.com/reports2/3.png)

###### 方法二高亮效果

![4](https://f2-pie-test.oss-cn-hangzhou.aliyuncs.com/reports2/4.png)

###### 方法二的缩放后效果

</center>

---

